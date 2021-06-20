import "./App.css";
import {
  Table,
  Tabs,
  notification,
  Button,
  Modal,
  Form,
  Radio,
  Input,
  Select,
} from "antd";
import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "./constants";

const { TabPane } = Tabs;

function App() {
  const [japan, setJapan] = useState([]);
  const [chagall, setChagall] = useState([]);
  const [addTicketVisible, setAddTicketVisible] = useState(false);
  const [serialNumber, setSerialNumber] = useState(false);
  const [filter, setFilter] = useState("");

  const toggleAddTicketVisible = () => setAddTicketVisible(!addTicketVisible);

  const [TOKEN, setTOKEN] = useState(localStorage.getItem("token") || "");

  const axiosOptions = {
    headers: { Authorization: TOKEN },
  };

  const fetchData = (exhibition) => {
    if (TOKEN) {
      axios
        .get(`${API}/tickets`, {
          params: {
            exhibition,
          },
          headers: {
            Authorization: TOKEN,
          },
        })
        .then((res) => {
          if (exhibition === "chagall") {
            setChagall(res.data);
          } else if (exhibition === "japan") {
            setJapan(res.data);
          }
        })
        .catch((error) => {
          notification.error({
            message: "Error",
            description: `获取${exhibition}数据失败！`,
          });
          console.error(error);
        });
    }
  };

  useEffect(() => {
    fetchData("japan");
    fetchData("chagall");
  }, [TOKEN]);

  const ticketNumberAddZeros = (number) => {
    let str = number.toString();
    while (str.length < 5) {
      str = "0" + str;
    }
    return str;
  };

  const column = [
    {
      title: "票号",
      dataIndex: "ticketNumber",
      render: (value) => ticketNumberAddZeros(value),
      sorter: (a, b) => a.ticketNumber - b.ticketNumber,
      defaultSortOrder: "ascend",
    },
    {
      title: "收票方",
      dataIndex: "client",
    },
    {
      title: "经手人",
      dataIndex: "operator",
    },
    {
      title: "票种",
      dataIndex: "type",
    },
    {
      title: "日期",
      dataIndex: "date",
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      title: "备注",
      dataIndex: "notes",
    },
    {
      title: "核销",
      dataIndex: "verified",
      render: (value) => (value ? "是" : "否"),
    },
    {
      title: "操作",
      render: (value, record) => (
        <>
          {record.verified ? null : (
            <Button
              type="primary"
              ghost
              size="small"
              onClick={() => {
                axios
                  .patch(
                    `${API}/ticket/status`,
                    {
                      exhibition: record.exhibition,
                      ticketNumber: record.ticketNumber,
                      verified: true,
                    },
                    axiosOptions
                  )
                  .then(() => {
                    fetchData(record.exhibition);
                    notification.success({
                      message: "核销成功",
                    });
                  })
                  .catch((error) => {
                    console.error(error);
                    notification.error({
                      message: "核销失败",
                    });
                  });
              }}
            >
              核销
            </Button>
          )}
          <Button
            style={{ marginLeft: 5 }}
            danger
            size="small"
            onClick={() => {
              axios
                .delete(`${API}/ticket`, {
                  headers: axiosOptions.headers,
                  data: {
                    exhibition: record.exhibition,
                    ticketNumber: record.ticketNumber,
                  },
                })
                .then(() => {
                  fetchData(record.exhibition);
                  notification.success({
                    message: "删除成功",
                  });
                })
                .catch((error) => {
                  console.error(error);
                  notification.error({
                    message: "删除失败",
                  });
                });
            }}
          >
            删除
          </Button>
        </>
      ),
    },
  ];

  const filterDataSource = (data) => {
    if (filter) {
      return data.filter((row) => JSON.stringify(row).includes(filter));
    }
    return data;
  };

  const searchAnything = (
    <Input.Search
      onSearch={(value) => setFilter(value)}
      style={{ width: 200, marginBottom: 5, float: "left" }}
      allowClear
    />
  );

  const app = (
    <div className="App">
      <Tabs
        defaultActiveKey={"japan"}
        tabBarExtraContent={
          <Button size="small" onClick={toggleAddTicketVisible} type="primary">
            添加纸质票
          </Button>
        }
      >
        <TabPane tab="Japan" key="japan">
          {searchAnything}
          <Table
            columns={column}
            dataSource={filterDataSource(japan)}
            rowKey={(record) => record.ticketNumber}
          />
        </TabPane>
        <TabPane tab="Chagall" key="chagall">
          {searchAnything}
          <Table
            columns={column}
            dataSource={filterDataSource(chagall)}
            rowKey={(record) => record.ticketNumber}
          />
        </TabPane>
      </Tabs>
      <Modal
        title="添加纸质票"
        visible={addTicketVisible}
        onCancel={toggleAddTicketVisible}
        okButtonProps={{ htmlType: "submit", form: "addTicket" }}
      >
        <Form
          onFinish={async (values) => {
            const document = {
              exhibition: values.exhibition,
              date: new Date(),
              operator: values.operator,
              client: values.client,
              type: values.type,
              notes: values.notes || "",
              verified: false,
            };
            if (serialNumber) {
              if (values.ticketNumbers.end < values.ticketNumbers.start) {
                notification.error({
                  message: "票号错误",
                  description: "起始票号必须小于结束票号！",
                });
                return;
              }
              const { ticketNumbers } = values;
              const payload = {
                exhibition: values.exhibition,
                documents: [],
              };
              for (
                let i = Number.parseInt(ticketNumbers.start);
                i <= Number.parseInt(ticketNumbers.end);
                i++
              ) {
                payload.documents.push({
                  ...document,
                  ticketNumber: ticketNumberAddZeros(i),
                });
              }
              axios
                .post(`${API}/tickets`, payload, axiosOptions)
                .then((res) => {
                  fetchData(values.exhibition);
                  notification.success({
                    message: "成功",
                    description: `成功添加${payload.documents.length}条纸质票记录`,
                  });
                  toggleAddTicketVisible();
                })
                .catch((error) => {
                  if (error.response) {
                    if (error.response.status === 409) {
                      notification.warn({
                        message: "票号冲突",
                        description: "有一部分或所有票号冲突，请重新添加",
                      });
                    }
                  } else {
                    notification.error({
                      message: "失败",
                      description: "添加纸质票记录失败",
                    });
                  }
                });
            } else {
              const payload = {
                ...document,
                ticketNumber: values.ticketNumber,
              };
              axios
                .post(`${API}/ticket`, payload, axiosOptions)
                .then((res) => {
                  fetchData(values.exhibition);
                  notification.success({
                    message: "成功",
                    description: `成功添加1条纸质票记录`,
                  });
                  toggleAddTicketVisible();
                })
                .catch((error) => {
                  if (error.response) {
                    if (error.response.status === 409) {
                      notification.error({
                        message: "票号冲突",
                        description: "票号冲突，请重新添加",
                      });
                    }
                  } else {
                    notification.error({
                      message: "失败",
                      description: "添加纸质票记录失败",
                    });
                  }
                });
            }
          }}
          name="addTicket"
          labelCol={{ span: 4, offset: 2 }}
          wrapperCol={{ span: 16 }}
        >
          <Form.Item
            label="展览"
            name="exhibition"
            rules={[{ required: true, message: "必须选择展览" }]}
          >
            <Radio.Group>
              <Radio value="japan">日本动漫</Radio>
              <Radio value="chagall">夏加尔</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="票号">
            <Input.Group compact>
              <Select
                defaultValue={1}
                onChange={(value) => {
                  value === 1 ? setSerialNumber(false) : setSerialNumber(true);
                }}
              >
                <Select.Option value={1}>单张</Select.Option>
                <Select.Option value={2}>连号</Select.Option>
              </Select>
              {serialNumber ? (
                <>
                  <Form.Item
                    name={["ticketNumbers", "start"]}
                    noStyle
                    rules={[
                      { required: true, message: "票号必须输入" },
                      {
                        pattern: /[0-9]/,
                        message: "票号只能是数字",
                      },
                      { len: 5, message: "票号必须是5位" },
                    ]}
                  >
                    <Input
                      style={{ width: 80, textAlign: "center" }}
                      placeholder="起始"
                    />
                  </Form.Item>
                  <Input
                    style={{
                      width: 30,
                      borderLeft: 0,
                      borderRight: 0,
                      pointerEvents: "none",
                      backgroundColor: "#fff",
                    }}
                    placeholder="~"
                    disabled
                  />
                  <Form.Item
                    name={["ticketNumbers", "end"]}
                    rules={[
                      { required: true, message: "票号必须输入" },
                      {
                        pattern: /[0-9]/,
                        message: "票号只能是数字",
                      },
                      { len: 5, message: "票号必须是5位" },
                    ]}
                    noStyle
                  >
                    <Input
                      className="site-input-right"
                      style={{
                        width: 80,
                        textAlign: "center",
                      }}
                      placeholder="结束"
                    />
                  </Form.Item>
                </>
              ) : (
                <Form.Item
                  name="ticketNumber"
                  noStyle
                  rules={[
                    { required: true, message: "票号必须输入" },
                    {
                      pattern: /[0-9]/,
                      message: "票号只能是数字",
                    },
                    { len: 5, message: "票号必须是5位" },
                  ]}
                >
                  <Input style={{ width: 200 }} />
                </Form.Item>
              )}
            </Input.Group>
          </Form.Item>
          <Form.Item
            label="收票方"
            name="client"
            rules={[{ required: true, message: "必须输入收票方" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="经手人"
            name="operator"
            rules={[{ required: true, message: "必须输入经手人" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="票种"
            name="type"
            rules={[{ required: true, message: "必须输入票种" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="备注" name="notes">
            <Input.TextArea row={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );

  const auth = (
    <div>
      <Modal
        okButtonProps={{ htmlType: "submit", form: "auth" }}
        title="请输入密码"
        visible
      >
        <Form
          name="auth"
          onFinish={(values) => {
            axios
              .post(`${API}/auth`, { password: values.password })
              .then((res) => {
                localStorage.setItem("token", res.data.token)
                setTOKEN(res.data.token)
              })
              .catch((error) => {
                console.error(error);
                notification.error({
                  message:'登录失败'
                })
              });
          }}
        >
          <Form.Item name="password" rules={[{ required: true }]} label="密码">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );

  return TOKEN ? app : auth;
}

export default App;
